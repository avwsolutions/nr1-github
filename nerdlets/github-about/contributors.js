import React from 'react';
import PropTypes from 'prop-types';
import Github from './github';

export default class Contributors extends React.Component {
  static propTypes = {
    userToken: PropTypes.string.isRequired,
    project: PropTypes.string,
    owner: PropTypes.string,
    repository: PropTypes.string
  };

  componentDidMount() {
    this.load();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.repository !== this.props.repository) {
      this.load();
    }
  }

  async processBatch(commitBatch, committers) {
    commitBatch.forEach(commit => {
      const { author } = commit;
      const commitAuthor = commit.commit.author;

      if (author) {
        const { login } = author;
        if (!committers[login]) {
          committers[login] = {
            login,
            homepage: author.html_url,
            email: commitAuthor.email,
            mostRecentCommit: commitAuthor.date,
            name: commitAuthor.name,
            commitCount: 0
          };
        }
        if (author.type === 'User') {
          const committer = committers[login];
          committer.commitCount += 1;
        }
      }
    });
  }

  async load() {
    this.setState({ committers: null });

    const { owner, project, userToken } = this.props;
    const github = new Github(userToken);
    const path = `repos/${owner}/${project}/commits`;

    const committers = {};

    let query = '';
    let commitBatch = null;
    try {
      for (let i = 0; i < 5; i++) {
        commitBatch = await github.get(path + query);
        // console.log(commitBatch);
        if (i > 0 && commitBatch) {
          commitBatch = commitBatch.slice(1);
        }

        if (commitBatch && commitBatch.length > 0) {
          // subsequent batches include the last commit from the previous batch
          this.processBatch(commitBatch, committers);
          const lastCommit = commitBatch[commitBatch.length - 1];
          query = `?sha=${lastCommit.sha}`;
        }
      }

      const committerList = Object.values(committers).sort(
        (x, y) => y.commitCount - x.commitCount
      );
      this.setState({ committers: committerList });
    } catch (e) {
      this.setState({
        error:
          commitBatch && commitBatch.message
            ? commitBatch.message
            : 'unknown error'
      });
      console.error(e); // eslint-disable-line no-console
    }
  }

  render() {
    if (this.state && this.state.error) {
      return (
        <>
          <h2>An error occurred:</h2>
          <p>{this.state.error}</p>
        </>
      );
    }
    if (!this.state || !this.state.committers) {
      return 'Loading Committers...';
    }

    return (
      <div style={{ paddingTop: '12px' }}>
        <h2>Most Frequent Recent Committers</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Commits</th>
              <th>Most Recent</th>
            </tr>
          </thead>
          <tbody>
            {this.state.committers.map(committer => {
              return (
                <tr key={committer.login}>
                  <td>{committer.name}</td>
                  <td>{committer.email}</td>
                  <td>{committer.commitCount}</td>
                  <td>{committer.mostRecentCommit}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
}
